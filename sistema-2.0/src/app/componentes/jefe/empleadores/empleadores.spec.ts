import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Empleadores } from './empleadores';

describe('Empleadores', () => {
  let component: Empleadores;
  let fixture: ComponentFixture<Empleadores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Empleadores],
    }).compileComponents();

    fixture = TestBed.createComponent(Empleadores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
