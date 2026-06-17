import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Academicos } from './academicos';

describe('Academicos', () => {
  let component: Academicos;
  let fixture: ComponentFixture<Academicos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Academicos],
    }).compileComponents();

    fixture = TestBed.createComponent(Academicos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
