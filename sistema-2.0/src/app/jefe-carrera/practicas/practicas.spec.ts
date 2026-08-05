import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Practicas } from './practicas';

describe('Practicas', () => {
  let component: Practicas;
  let fixture: ComponentFixture<Practicas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Practicas],
    }).compileComponents();

    fixture = TestBed.createComponent(Practicas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
